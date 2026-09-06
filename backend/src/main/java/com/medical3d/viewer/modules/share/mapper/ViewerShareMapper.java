package com.medical3d.viewer.modules.share.mapper;
import com.medical3d.viewer.modules.share.entity.ViewerShareEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.Optional;
@Mapper public interface ViewerShareMapper { Optional<ViewerShareEntity> findByTokenHash(@Param("tokenHash") String tokenHash); }
