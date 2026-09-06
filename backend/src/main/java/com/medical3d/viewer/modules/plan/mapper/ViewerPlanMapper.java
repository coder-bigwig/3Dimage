package com.medical3d.viewer.modules.plan.mapper;
import com.medical3d.viewer.modules.plan.entity.ViewerPlanEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.Optional;
import java.util.UUID;
@Mapper public interface ViewerPlanMapper {
    Optional<ViewerPlanEntity> findById(@Param("id") UUID id);
    boolean belongsToResult(@Param("id") UUID id, @Param("resultId") UUID resultId);
    int insert(ViewerPlanEntity entity);
    int updateState(UpdatePlanStateCommand command);
    int deleteByIdAndResultId(@Param("id") UUID id, @Param("resultId") UUID resultId);
}
