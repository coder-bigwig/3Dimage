package com.medical3d.viewer.modules.measurement.mapper;
import com.medical3d.viewer.modules.measurement.entity.MeasurementEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.UUID;
@Mapper public interface MeasurementMapper {
    List<MeasurementEntity> findByPlanId(@Param("planId") UUID planId);
    int deleteByPlanId(@Param("planId") UUID planId);
    int insert(MeasurementEntity entity);
}
